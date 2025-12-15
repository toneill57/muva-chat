# Node Version Update - Node 20 LTS Required

## ⚠️ IMPORTANTE

El proyecto ahora requiere **Node 20 LTS** para asegurar compatibilidad con producción.

**Versiones:**
- ✅ Local: Node 20.x
- ✅ VPS Production: Node 20.18.2
- ✅ GitHub Actions: Node 20

## Cambiar a Node 20 (Recomendado)

### Usando nvm (Recomendado):

```bash
# Instalar Node 20 LTS
nvm install 20

# Usar Node 20 (automático con .nvmrc)
nvm use

# Verificar versión
node --version  # Debe mostrar v20.x.x

# Reinstalar dependencias con Node 20
rm -rf node_modules
pnpm install
```

### Configurar nvm para usar automáticamente:

Agrega esto a tu `~/.zshrc` o `~/.bashrc`:

```bash
# Auto-switch Node version with .nvmrc
autoload -U add-zsh-hook
load-nvmrc() {
  if [[ -f .nvmrc && -r .nvmrc ]]; then
    nvm use
  fi
}
add-zsh-hook chpwd load-nvmrc
load-nvmrc
```

## ¿Por qué Node 20?

1. **Compatibilidad**: Next.js 15.5.7 funciona mejor con Node 20
2. **Producción**: VPS usa Node 20 LTS
3. **CI/CD**: GitHub Actions usa Node 20
4. **Estabilidad**: Node 22/24 son muy nuevos y tienen problemas con:
   - Turbopack (beta)
   - ES modules vs CommonJS
   - Módulos nativos compilados

## Verificación

El proyecto ahora te avisará automáticamente si usas una versión incorrecta:

```bash
pnpm install
# ⚠️  WARNING: Node version mismatch!
#    Current:  v24.5.0
#    Required: v20.18.2 (Node 20.x)
```

## Archivos Agregados

- `.nvmrc` - Especifica Node 20.18.2
- `package.json` - Engines: Node >=20 <21
- `scripts/check-node-version.js` - Verifica versión en postinstall
