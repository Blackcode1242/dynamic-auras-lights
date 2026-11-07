# Dynamic Auras & Lights

Extensão experimental para Owlbear Rodeo 2.0.

## Recursos
- Formato da aura: círculo ou quadrado.
- Suavidade da borda ajustável (de borda limpa a brilho totalmente difuso).
- Posição: abaixo ou acima do token.
- Modos de mistura (Soft Light, Hard Light, Overlay, Screen, Multiply, Plus etc.).
- Efeitos animados: tocha, lâmpada defeituosa, queda de energia, emergência, arcana, divina, espectral, pulsante e estática.
- A aura é centralizada no centro visual da imagem do token, mesmo com token girado ou redimensionado.

## Requisitos
- Node.js 20+
- npm
- Conta GitHub

## Rodar localmente
```bash
npm install
npm run dev
```
Adicione `http://localhost:5173/manifest.json` no Owlbear Rodeo como extensão.

## Compilar
```bash
npm run build
```
O resultado fica na pasta `dist/`.

## Publicar no GitHub Pages
1. Crie um repositório GitHub e envie todos os arquivos deste projeto.
2. Em Settings > Pages, selecione **GitHub Actions** como fonte.
3. Faça push para a branch `main` (o workflow `.github/workflows/deploy.yml` publica o conteúdo de `dist/`).
4. Depois do deploy, o manifesto estará em:
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/manifest.json`
5. No Owlbear, abra o gerenciador de extensões, clique em adicionar e cole esse endereço.

## Limitações desta versão
- Os efeitos são adicionados via `OBR.scene.local`: são locais à instância/navegador que os criou, não sincronizados automaticamente para os demais jogadores.
- O efeito é uma aura visual em shader, não uma fonte de luz do sistema Dynamic Fog. Portanto, não ilumina áreas ocultas nem remove fog.
- A remoção usa os IDs locais guardados no armazenamento do navegador. Limpar os dados do site pode impedir que a extensão encontre efeitos antigos.
- Teste em uma sala de teste antes de usar em sessão. O SDK e os tipos do Owlbear podem mudar; valide `npm run build` e teste no Owlbear real.

## Próximas melhorias
- Sincronização entre jogadores com permissões e armazenamento compartilhado.
- Context menu para aplicar aura com clique direito.
- Suporte a mais tipos de item (props e montarias).
- Integração opcional com Dynamic Fog para fontes de luz reais.
