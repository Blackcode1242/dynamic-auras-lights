# Dynamic Auras & Lights

Extensão experimental para Owlbear Rodeo 2.0: auras e luzes animadas nos tokens.

## Como usar
1. **Clique com o botão direito no token** e escolha **Ativar aura**. O painel abre na lateral direita.
2. Mexa nos controles do painel: tudo muda **na hora** no token, sem remover e aplicar de novo.
3. O painel acompanha a seleção: clique em outro token e ele mostra (e edita) a aura daquele token.
4. Para desligar: botão direito → **Desligar aura**, ou o interruptor **Aura ativa** do painel.

O ícone da extensão na barra de ferramentas abre o mesmo painel (nesse caso ele fecha ao clicar fora).

## Luz ambiente em desenhos
Formas (retângulo, círculo, triângulo, hexágono) e curvas desenhadas no mapa também aceitam aura. A luz **preenche o contorno do desenho**, então serve para iluminar uma sala inteira.
1. Desenhe a forma (ou curva fechada) no mapa e selecione-a.
2. Botão direito → **Ativar luz ambiente**.
3. No painel, ajuste efeito, cor, intensidade e **Suavidade da borda** (quanto a luz esmaece para dentro do contorno).
4. **Expansão da luz** define quantos quadrados a luz vaza para fora do contorno (0 = só dentro).
5. Ative **Esconder o desenho (opacidade 0)** para sumir com o desenho e deixar só a luz. Desligar a aura devolve a opacidade original.

Observações: curvas são tratadas como polígonos fechados e simplificadas para no máximo 48 pontos; linhas abertas viram uma faixa retangular em volta delas.

## Novidades da 1.4

**Cone e linha.** Em *Formato*, escolha Cone (com *abertura* em graus) ou Linha (com *largura* em quadrados). Os dois saem do centro do token, na direção em que ele está olhando, e giram junto com ele. *Direção* soma um desvio em graus (0° = topo da imagem do token).

**Condições.** Novo grupo no seletor de efeitos: Envenenado, Sangrando, Em chamas, Congelado, Abençoado, Amaldiçoado, Enfeitiçado, Amedrontado, Atordoado, Paralisado, Concentrando e Invisível. Já vêm com raio pequeno, pensado para ficar em volta do token.

**Meus presets.** Em *Meus presets*: salve a configuração atual com um nome, aplique, apague, ou use *Exportar / importar* para copiar tudo como texto e compartilhar com outros GMs. Ficam guardados neste navegador.

**Luz no Dynamic Fog.** Em *Luz no fog*, a extensão cria uma luz do fog dinâmico nativo do Owlbear (item `LIGHT`) no token, com o mesmo alcance e formato (círculo ou cone; a linha vira um cone fino). Tipos: primária, secundária e auxiliar. A luz é local: cada pessoa a cria no seu navegador. Só vale para tokens.
- A documentação do Owlbear não informa a unidade dos ângulos nem a direção do cone com rotação 0. A extensão assume graus. Se o cone do fog sair torto em relação ao cone visual, use *Ajuste da direção do cone no fog* em *Desempenho* (tente 90 ou -90).
- O estado das luzes do fog aparece no *Diagnóstico*.

**Qualidade (por computador).** Em *Desempenho*: Alta, Média ou Baixa. Média troca os efeitos mais pesados (chama, elétrico, cintilante, bolhas, órbita) por brilho simples. Baixa deixa só brilho e anel. As duas também simplificam contornos de desenhos e usam sombras duras no fog (`sourceRadius = 0`, o caminho mais rápido segundo a documentação).

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
