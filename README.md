# Dynamic Auras & Lights

Extensão experimental para Owlbear Rodeo 2.0: auras e luzes animadas nos tokens.

## Como usar
1. **Clique com o botão direito no token** e escolha **Ativar aura**. O painel abre na lateral direita.
2. Mexa nos controles do painel: tudo muda **na hora** no token, sem remover e aplicar de novo.
3. O painel acompanha a seleção: clique em outro token e ele mostra (e edita) a aura daquele token.
4. Para desligar: botão direito → **Desligar aura**, ou o interruptor **Aura ativa** do painel.

O ícone da extensão na barra de ferramentas abre o mesmo painel (nesse caso ele fecha ao clicar fora).

## Recursos
- A aura fica salva no próprio token, então acompanha a cena e aparece para todos os jogadores que tenham a extensão.
- Formato círculo ou quadrado, com suavidade de borda ajustável.
- Posição abaixo ou acima do token e vários modos de mistura (Soft Light, Hard Light, Overlay, Screen, Multiply, Plus etc.).
- Centralizada no centro visual da imagem do token, mesmo com token girado ou redimensionado.
- Funciona em tokens das camadas Personagem, Montaria e Prop.

### Efeitos
**Iluminação:** Tocha, Vela, Fogueira, Lâmpada defeituosa, Queda de energia, Neon, Relâmpago, Luz fixa.
**Auras:** Arcana, Divina, Espectral, Pulsante, Batimento, Emergência, Giroflex (feixes), Sonar (ondas), Escudo (anel), Elétrica, Cintilante.

## Requisitos
- Node.js 20+
- npm
- Conta GitHub

## Rodar localmente
```bash
npm install
npm run dev
```
O `public/manifest.json` aponta para o GitHub Pages. Para testar localmente, crie uma cópia do manifest com as URLs `http://localhost:5173/` (popover) e `http://localhost:5173/background.html` (`background_url`) e adicione essa cópia no Owlbear.

## Compilar
```bash
npm run build
```
O resultado fica na pasta `dist/` (inclui `index.html` do painel e `background.html` do script de fundo).

## Publicar no GitHub Pages
1. Envie todos os arquivos para o repositório (branch `main`).
2. Em Settings > Pages, selecione **GitHub Actions** como fonte.
3. O workflow `.github/workflows/deploy.yml` publica o conteúdo de `dist/`.
4. Manifesto: `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/manifest.json`
5. No Owlbear, adicione esse endereço no gerenciador de extensões. Se a extensão já estava adicionada, basta recarregar a página (`Ctrl + F5`).

## Limitações
- Cada jogador precisa ter a extensão adicionada na própria conta para ver as auras.
- O efeito é visual (shader). Não é uma fonte de luz do Dynamic Fog, então não ilumina áreas ocultas nem remove fog.
- O Owlbear pode mudar o SDK; valide `npm run build` e teste em uma sala de teste antes de usar em sessão.

## Próximas melhorias
- Integração opcional com Dynamic Fog para fontes de luz reais.
- Presets personalizados salvos pelo usuário.
