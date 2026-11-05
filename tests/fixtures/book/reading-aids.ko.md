---
title: "우리의 기준: 성과 규칙 v1"
format: native
syntax: 1
lang: ko
summary: 스코어러가 실행이 기준을 넘는지 판단하는 방법을, 수식과 용어와 함께 설명합니다.
translated_from:
  lang: en
  version: 1
tags:
  - fixture
  - reading-aids
---
## 실행 채점하기 {#scoring-a-run}

규칙은 평균 수익이 잡음보다 뚜렷하게 큰지를 묻고, 그 답을 [t-통계량](term:tstat)으로 냅니다.

스코어러는 각 이벤트의 손익을 [K](term:k) 대비 %로 받아 $`s = \mathrm{mean} \div \mathrm{sd}`$와 $`t = s \times \sqrt{n}`$을 계산합니다. 평균 K 대비 +0.10 %, sd 0.25 %인 이벤트 서른 개면 $`t \approx 2.19`$로, B6의 2.0을 조금 넘습니다. 같은 이벤트 열다섯 개면 1.55로, CONDITIONAL-GO의 1.5에는 충분하지만 B6에는 못 미칩니다.

```formula #tstat
tex: |
  \begin{aligned}
  s &= \frac{\mathrm{mean}}{\mathrm{sd}} \\
  t &= s \times \sqrt{n}
  \end{aligned}
alt: s는 평균 나누기 sd, t는 s 곱하기 n의 제곱근
reading: '이벤트당 평균 손익을 그 흔들림으로 나눈 뒤 이벤트 수의 제곱근을 곱합니다. 이벤트가 네 배면 결과는 두 배가 됩니다.'
where:
  - sym: 't'
    means: '[t-통계량](term:tstat): 평균 손익이 0에서 표준오차 몇 개만큼 떨어져 있는지'
  - sym: 's'
    means: '이벤트당 [샤프 비율](term:sharpe)'
  - sym: 'n'
    means: '이벤트 수'
  - sym: '\mathrm{mean}'
    means: '이벤트당 평균 손익, [K](term:k) 대비 %'
  - sym: '\mathrm{sd}'
    means: '이벤트당 손익의 표준편차: 얼마나 흔들리는지'
```

위의 이벤트 서른 개로 계산하면:

```formula #worked
tex: |
  \begin{aligned}
  t &= \left(\frac{\mathrm{mean}}{\mathrm{sd}}\right) \times \sqrt{n} \\
  &= \left(\frac{0.10}{0.25}\right) \times \sqrt{30} \\
  &\approx 0.40 \times 5.48 \\
  &\approx 2.19
  \end{aligned}
alt: t는 평균 나누기 sd 곱하기 n의 제곱근, 0.10 나누기 0.25 곱하기 30의 제곱근, 약 0.40 곱하기 5.48, 약 2.19
reading: '평균 K 대비 +0.10 %, 흔들림 0.25 %인 이벤트 서른 개면 t-통계량은 약 2.19로, B6의 2.0을 조금 넘습니다.'
where:
  - sym: 't'
    means: '[t-통계량](term:tstat)'
  - sym: '\mathrm{mean}'
    means: '[K](term:k) 대비 +0.10 %, 이벤트당 평균 손익'
  - sym: '\mathrm{sd}'
    means: 'K 대비 0.25 %, 이벤트당 손익의 흔들림'
  - sym: 'n'
    means: '30, 이벤트 수'
```

이 장의 모든 수치는 [워크포워드 백테스트](term:walkforward)에서 나옵니다. 그래서 각 결과는 그 앞의 조정에 대해 [표본 외](term:oos)이고, [미래 참조 편향](term:lookahead)이 없습니다. 좋은 수치 하나로 부족한 이유는 시도 횟수 세기에서 다룹니다. 규칙은 최악의 [낙폭](term:drawdown)에도 한도를 두고, 모든 결과에서 [헤어컷](term:haircut)만큼 깎습니다.

## 시도 횟수 세기 {#counting-the-trials}

여러 백테스트 중 가장 좋은 것을 고르면 결과가 부풀려집니다. [디플레이티드 샤프 비율(DSR)](term:dsr)이 이 문제에 답합니다. 실제 [샤프 비율](term:sharpe)이 기준선을 넘을 확률이며, 기준선은 시도 횟수만큼 높아집니다.

스코어러는 시도들의 상관행렬에서 [참여 비율](term:participation)을 구합니다. 그 [고유값](term:eigenvalue) $`e`$로 $`(\sum e)^2 \div \sum e^2`$를 계산하며, 완전히 같이 움직이는 시도 열 개는 1로, 서로 독립인 시도 열 개는 10으로 셉니다.

```formula #participation
tex: |
  N = \frac{\left(\sum_i e_i\right)^2}{\sum_i e_i^2}
alt: N은 e i 합의 제곱 나누기 e i 제곱의 합
reading: '고유값의 합을 제곱해 고유값 제곱의 합으로 나눕니다. 완전히 같이 움직이는 시도 열 개는 1로, 독립인 시도 열 개는 10으로 셉니다.'
where:
  - sym: 'N'
    means: '[참여 비율](term:participation): 시도들이 독립 시도 몇 개에 해당하는지'
  - sym: 'e_i'
    means: '시도들의 상관행렬의 i번째 [고유값](term:eigenvalue)'
  - sym: '\sum_i'
    means: 'i = 1부터 시도 횟수까지 모든 고유값을 더함'
```

[확률적 샤프 비율(PSR)](term:psr)은 샤프 비율을 확률로 바꿉니다. 정규분포가 아닌 수익까지 감안해 실제 비율이 정한 기준을 넘을 확률을 내며, 기록이 길고 왜도가 양수일수록 오르고 꼬리가 두꺼울수록 내려갑니다.

## 아무 일도 없을 때 {#when-nothing-happens}

서로 독립인 이벤트가 일정한 비율로 일어나면, 한 구간의 이벤트 수는 평균 $`\lambda = \mathrm{rate} \times \mathrm{time}`$인 포아송 분포를 따르고, 이벤트가 하나도 없을 확률은 $`e^{-\lambda}`$입니다.

```formula #poisson
tex: |
  \begin{aligned}
  \lambda &= \mathrm{rate} \times \mathrm{time} \\
  P(\text{no event}) &= e^{-\lambda}
  \end{aligned}
alt: 람다는 비율 곱하기 시간, 이벤트 없음의 확률은 e의 마이너스 람다 제곱
reading: '구간이 길수록 기대하는 이벤트가 많아지고, 하나도 보지 못할 확률은 빠르게 0에 가까워집니다.'
where:
  - sym: '\lambda'
    means: '구간 동안 기대하는 이벤트 수'
  - sym: '\mathrm{rate}'
    means: '단위 시간당 이벤트 수, 일정하고 서로 독립'
  - sym: '\mathrm{time}'
    means: '구간의 길이'
  - sym: 'P(\text{no event})'
    means: '이벤트를 하나도 보지 못할 확률'
  - sym: 'e'
    means: '오일러 수, 약 2.718'
```

```quiz #check-the-bar
title: 기준 확인
items:
  - id: fifteen-events
    type: choice
    prompt: 이벤트 열다섯 개가 평균 K 대비 +0.10 %, sd 0.25 %입니다. 이 이벤트들의 t는 어느 기준을 넘습니까?
    options:
      - {id: b6, text: B6의 2.0}
      - {id: conditional-go, text: CONDITIONAL-GO의 1.5}
      - {id: both, text: 둘 다}
      - {id: neither, text: 둘 다 아님}
    answer: [conditional-go]
    explain: 같은 이벤트 열다섯 개면 t는 약 1.55로, 1.5는 넘고 2.0에는 못 미칩니다.
```

```glossary #glossary
terms:
  - id: sharpe
    term: 샤프 비율
    short: '평균 수익을 수익이 흔들리는 정도로 나눈 값입니다. 여기서는 이벤트 단위로 셉니다. 이벤트 손익의 평균을 표준편차(sd)로 나눕니다. 값이 클수록 감수한 위험에 비해 수익이 꾸준하다는 뜻입니다.'
    long: '스코어러는 이를 $`s`$로 씁니다. 이 값만으로는 운을 가려낼 수 없습니다. 기록이 짧으면 우연히 높게 나올 수 있기 때문입니다. 그래서 규칙은 이를 t-통계량으로 바꾸고, 디플레이티드 샤프 비율과 확률적 샤프 비율은 확률로 바꿉니다.'
  - id: dsr
    term: 디플레이티드 샤프 비율
    aliases: [DSR]
    short: '확률입니다. 전략의 실제 샤프 비율이 기준선을 넘을 확률이며, 기준선은 시도한 횟수만큼 높아집니다. 변형을 많이 시험할수록 기준선이 올라가, 운 좋게 나온 최고 결과는 덜 인정받습니다.'
    long: '여러 변형을 시험해 가장 좋은 것만 고르면 우연만으로도 샤프 비율이 부풀려집니다. 디플레이티드 샤프 비율은 이 선택을 바로잡습니다. 시도들의 상관관계로 실질 시도 횟수(참여 비율)를 세고, 그만큼 기준선을 올린 뒤, 실제 비율이 그 기준선을 넘을 확률을 묻습니다. 규칙의 기준은 [DSR 기준]입니다.'
  - id: psr
    term: 확률적 샤프 비율
    aliases: [PSR]
    short: '샤프 비율을 확률로 바꾼 값입니다. 정규분포가 아닌 수익까지 감안해, 실제 샤프 비율이 정한 기준을 넘을 확률을 냅니다. 기록이 길고 왜도가 양수일수록 오르고, 꼬리가 두꺼울수록 내려갑니다.'
    long: '“얼마나 높은가”가 아니라 “얼마나 확신할 수 있는가”에 답합니다. 샤프 비율이 같아도 기록이 더 길거나 꼬리가 더 얇은 쪽의 PSR이 더 높습니다. 디플레이티드 샤프 비율은 기준을 시도 횟수만큼 올린 PSR입니다.'
  - id: participation
    term: 참여 비율
    aliases: [실질 시도 횟수]
    short: '서로 상관된 시도들이 독립적인 시도 몇 개에 해당하는지를 나타냅니다. 완전히 같이 움직이는 시도 열 개는 1로, 서로 독립인 시도 열 개는 10으로 셉니다. 스코어러는 시도들의 상관행렬의 고유값으로 계산합니다.'
    long: '고유값의 합을 제곱한 뒤 고유값 제곱의 합으로 나눕니다. 모든 시도가 같이 움직여 고유값 하나가 전부를 차지하면 1이 되고, 고유값이 모두 같으면 시도 횟수와 같아집니다. 디플레이티드 샤프 비율은 이 값을 시도 횟수로 씁니다.'
  - id: eigenvalue
    term: 고유값
    short: '행렬이 자기 고유한 방향 하나를 따라 얼마나 늘이는지를 나타내는 수입니다. 시도들의 상관행렬에서 고유값 하나는 공통된 움직임 가운데 독립적인 한 방향에 담긴 몫을 재며, 모두 더하면 시도 횟수가 됩니다.'
  - id: walkforward
    term: 워크포워드 백테스트
    short: '과거의 한 구간으로 전략을 조정하고, 아직 보지 않은 다음 구간에서 시험한 뒤, 앞으로 한 걸음 옮겨 반복하는 백테스트입니다. 전략을 실제로 한 기간씩 운용했을 때를 흉내 냅니다.'
    long: '각 시험 구간은 그 앞의 조정에 대해 표본 외 데이터이므로, 이어 붙인 결과에는 미래 참조 편향이 없습니다. 규칙은 매 단계 [조정 구간]으로 조정하고 [시험 구간]으로 시험합니다.'
  - id: lookahead
    term: 미래 참조 편향
    aliases: [룩어헤드 편향]
    short: '결정하는 순간에는 알 수 없었던 정보를 백테스트가 쓰는 오류입니다. 그날 종가로 시가에 거래하는 것이 그 예입니다. 실제로는 낼 수 없었던 좋은 결과를 보여 줍니다.'
  - id: oos
    term: 표본 외
    aliases: [아웃오브샘플, OOS]
    short: '전략을 조정하는 데 쓰지 않은 데이터입니다. 표본 외에서 잰 결과는 설정을 고르는 데 쓴 데이터로 잰 결과보다 실제 성과를 더 공정하게 짐작하게 해 줍니다.'
  - id: drawdown
    term: 낙폭
    aliases: [드로다운]
    short: '계좌가 도달한 최고점에서 이후 저점까지 떨어진 폭이며, K 대비 %로 잽니다. 기록 중 가장 큰 낙폭은 다음 최고점까지 견뎌야 했던 최악의 손실입니다.'
    long: '시작점이 아니라 그때까지의 최고점에서 재므로, 전체로는 이익이어도 깊은 낙폭 속에 있을 수 있습니다. 규칙의 한도는 K의 [낙폭 한도]입니다.'
  - id: haircut
    term: 헤어컷
    short: '백테스트 수치를 믿기 전에 일부러 깎는 것입니다. 거래 비용과 백테스트가 보지 못하는 낙관을 감안하기 위해서입니다. 규칙은 결과를 기준과 비교하기 전에 [헤어컷]만큼 깎습니다.'
  - id: k
    term: K
    aliases: [포지션 크기]
    short: '모든 이벤트의 손익을 재는 기준이 되는 포지션 크기입니다. 손익을 K 대비 %로 쓰면 크기가 다른 이벤트끼리 비교할 수 있습니다. K 대비 +0.10 %는 포지션의 0.1 %만큼 번 것입니다.'
  - id: tstat
    term: t-통계량
    aliases: [t]
    short: '평균이 0에서 얼마나 떨어져 있는지를 표준오차 단위로 센 값입니다. 스코어러는 이벤트당 샤프 비율과 이벤트 수로 계산합니다. 평균 K 대비 +0.10 %, sd 0.25 %인 이벤트 서른 개면 2.19로, B6의 2.0을 조금 넘습니다.'
    long: '값이 클수록 평균이 운일 가능성이 낮습니다. 이벤트 수의 제곱근에 따라 커지므로, 같은 이벤트당 샤프 비율로 값을 두 배로 만들려면 이벤트가 네 배 필요합니다. 그런 이벤트 열다섯 개는 1.55로, CONDITIONAL-GO의 1.5에는 충분하지만 B6에는 못 미칩니다.'
```

## Sources {#sources-list}

```sources #sources
items:
  - id: src-rule
    title: "[출처 제목]"
    url: https://example.com/source
    publisher: "[저자]"
    date: "[연도]"
```
