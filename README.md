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

## Novidades da 1.5: integração com o Dynamic Day Cycle
Cada aura/luz (token ou desenho) ganhou **Quando acende**: *Sempre*, *Só à noite* ou *Só de dia*. Isso só tem efeito quando a extensão **Dynamic Day Cycle** está ativa na cena; sem ela, tudo continua sempre aceso como antes. A agenda vale também para a luz do Dynamic Fog do token. Cada luz acende/apaga com uma pequena variação de minutos (configurada no Day Cycle), então a cidade vai acendendo aos poucos.
A comunicação é só pelos metadados da cena (`src/clock.ts`, idêntico nas duas extensões): uma não precisa da outra para funcionar.

### Efeitos
**Iluminação:** Tocha, Vela, Fogueira, Lâmpada defeituosa, Queda de energia, Neon, Relâmpago, Luz fixa.
**Auras:** Arcana, Divina, Espectral, Pulsante, Batimento, Emergência, Giroflex (feixes), Sonar (ondas), Escudo (anel), Elétrica, Cintilante.
