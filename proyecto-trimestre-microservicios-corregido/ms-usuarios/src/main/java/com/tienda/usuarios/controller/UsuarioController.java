package com.tienda.usuarios.controller;

import com.tienda.usuarios.model.LoginRequest;
import com.tienda.usuarios.model.RegistroRequest;
import com.tienda.usuarios.model.Usuario;
import com.tienda.usuarios.repository.UsuarioRepository;
import com.tienda.usuarios.service.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public UsuarioController(UsuarioRepository usuarioRepository, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.jwtService = jwtService;
    }

    // POST /api/usuarios/registrar -> crea la cuenta (publico)
    @PostMapping("/registrar")
    public ResponseEntity<?> registrar(@Valid @RequestBody RegistroRequest req) {
        if (usuarioRepository.existsByEmail(req.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Ya existe una cuenta con ese email"));
        }

        String hash = encoder.encode(req.getContrasena());
        Usuario nuevo = new Usuario(req.getNombres(), req.getApellidos(), req.getEmail(), hash);
        usuarioRepository.save(nuevo);

        Map<String, Object> body = new HashMap<>();
        body.put("id", nuevo.getId());
        body.put("email", nuevo.getEmail());
        body.put("mensaje", "Usuario creado correctamente");
        return ResponseEntity.status(HttpStatus.CREATED).body(body);
    }

    // POST /api/usuarios/login -> valida credenciales y devuelve el JWT
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        Optional<Usuario> encontrado = usuarioRepository.findByEmail(req.getEmail());

        if (encontrado.isEmpty() || !encoder.matches(req.getContrasena(), encontrado.get().getContrasenaHash())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Email o contraseña incorrectos"));
        }

        Usuario usuario = encontrado.get();
        String token = jwtService.generarToken(usuario.getId(), usuario.getEmail(), usuario.getRol());

        Map<String, Object> body = new HashMap<>();
        body.put("token", token);
        body.put("email", usuario.getEmail());
        body.put("rol", usuario.getRol());
        return ResponseEntity.ok(body);
    }

    // GET /api/usuarios/perfil -> requiere JWT valido en el header Authorization
    @GetMapping("/perfil")
    public ResponseEntity<?> perfil(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token JWT inválido o ausente"));
        }

        String token = authHeader.substring("Bearer ".length());
        try {
            Claims claims = jwtService.validarYObtenerClaims(token);
            Usuario usuario = usuarioRepository.findByEmail(claims.getSubject())
                    .orElseThrow();

            Map<String, Object> body = new HashMap<>();
            body.put("id", usuario.getId());
            body.put("nombres", usuario.getNombres());
            body.put("apellidos", usuario.getApellidos());
            body.put("email", usuario.getEmail());
            body.put("rol", usuario.getRol());
            return ResponseEntity.ok(body);
        } catch (JwtException | NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token JWT inválido o expirado"));
        }
    }

    // GET /api/usuarios -> lista TODOS los usuarios registrados (requiere JWT).
    // Sirve para confirmar en pantalla que los registros se estan guardando
    // correctamente en la base de datos. Nunca devuelve el hash de la contraseña.
    @GetMapping
    public ResponseEntity<?> listar(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token JWT inválido o ausente"));
        }

        String token = authHeader.substring("Bearer ".length());
        try {
            jwtService.validarYObtenerClaims(token);
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Token JWT inválido o expirado"));
        }

        List<Map<String, Object>> usuarios = usuarioRepository.findAll().stream()
                .map(u -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", u.getId());
                    m.put("nombres", u.getNombres());
                    m.put("apellidos", u.getApellidos());
                    m.put("email", u.getEmail());
                    m.put("rol", u.getRol());
                    return m;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(usuarios);
    }

    // GET /api/usuarios/validar -> usado por los otros microservicios si algun dia
    // necesitan confirmar el token contra Auth en vez de verificarlo por su cuenta.
    @GetMapping("/validar")
    public ResponseEntity<?> validar(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        try {
            Claims claims = jwtService.validarYObtenerClaims(token);
            return ResponseEntity.ok(Map.of(
                    "valido", true,
                    "email", claims.getSubject(),
                    "rol", claims.get("rol")
            ));
        } catch (JwtException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("valido", false));
        }
    }
}
