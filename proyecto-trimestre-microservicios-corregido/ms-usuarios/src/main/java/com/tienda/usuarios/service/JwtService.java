package com.tienda.usuarios.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Genera y verifica los JWT que despues validan, de forma independiente,
 * ms-productos y ms-compras. Los tres servicios comparten la misma
 * JWT_SECRET, por eso no necesitan llamarse entre si para confirmar
 * que un token es valido.
 */
@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiracion-horas:8}")
    private long expiracionHoras;

    private SecretKey obtenerLlave() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generarToken(Long id, String email, String rol) {
        Date ahora = new Date();
        Date expira = new Date(ahora.getTime() + expiracionHoras * 3600_000);

        return Jwts.builder()
                .subject(email)
                .claim("id", id)
                .claim("rol", rol)
                .issuedAt(ahora)
                .expiration(expira)
                .signWith(obtenerLlave())
                .compact();
    }

    public Claims validarYObtenerClaims(String token) {
        return Jwts.parser()
                .verifyWith(obtenerLlave())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
