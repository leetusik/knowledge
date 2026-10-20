---
format: native
syntax: 1
---
## At the limits {#at-limits}

```quiz #quiz-at
items:
  - id: quiz-at-choice
    type: choice
    prompt: Pick
    options:
      - {id: o1, text: Option 1}
      - {id: o2, text: Option 2}
      - {id: o3, text: Option 3}
      - {id: o4, text: Option 4}
      - {id: o5, text: Option 5}
      - {id: o6, text: Option 6}
    answer: [o1]
    explain: E
  - id: quiz-at-cloze
    type: cloze
    text: Fill {{b1}} {{b2}} {{b3}} {{b4}} {{b5}} in.
  - id: quiz-at-r3
    type: recall
    prompt: Question 3
    answer: Answer
  - id: quiz-at-r4
    type: recall
    prompt: Question 4
    answer: Answer
  - id: quiz-at-r5
    type: recall
    prompt: Question 5
    answer: Answer
  - id: quiz-at-r6
    type: recall
    prompt: Question 6
    answer: Answer
  - id: quiz-at-r7
    type: recall
    prompt: Question 7
    answer: Answer
  - id: quiz-at-r8
    type: recall
    prompt: Question 8
    answer: Answer
  - id: quiz-at-r9
    type: recall
    prompt: Question 9
    answer: Answer
  - id: quiz-at-r10
    type: recall
    prompt: Question 10
    answer: Answer
  - id: quiz-at-r11
    type: recall
    prompt: Question 11
    answer: Answer
  - id: quiz-at-r12
    type: recall
    prompt: Question 12
    answer: Answer
  - id: quiz-at-r13
    type: recall
    prompt: Question 13
    answer: Answer
  - id: quiz-at-r14
    type: recall
    prompt: Question 14
    answer: Answer
  - id: quiz-at-r15
    type: recall
    prompt: Question 15
    answer: Answer
  - id: quiz-at-r16
    type: recall
    prompt: Question 16
    answer: Answer
  - id: quiz-at-r17
    type: recall
    prompt: Question 17
    answer: Answer
  - id: quiz-at-r18
    type: recall
    prompt: Question 18
    answer: Answer
  - id: quiz-at-r19
    type: recall
    prompt: Question 19
    answer: Answer
  - id: quiz-at-r20
    type: recall
    prompt: Question 20
    answer: Answer
```

```diagram #flow-at
kind: flow
title: Big flow
nodes:
  - {id: n1, label: N1}
  - {id: n2, label: N2}
  - {id: n3, label: N3}
  - {id: n4, label: N4}
  - {id: n5, label: N5}
  - {id: n6, label: N6}
  - {id: n7, label: N7}
  - {id: n8, label: N8}
  - {id: n9, label: N9}
  - {id: n10, label: N10}
  - {id: n11, label: N11}
  - {id: n12, label: N12}
  - {id: n13, label: N13}
  - {id: n14, label: N14}
  - {id: n15, label: N15}
  - {id: n16, label: N16}
  - {id: n17, label: N17}
  - {id: n18, label: N18}
  - {id: n19, label: N19}
  - {id: n20, label: N20}
  - {id: n21, label: N21}
  - {id: n22, label: N22}
  - {id: n23, label: N23}
  - {id: n24, label: N24}
  - {id: n25, label: N25}
  - {id: n26, label: N26}
  - {id: n27, label: N27}
  - {id: n28, label: N28}
  - {id: n29, label: N29}
  - {id: n30, label: N30}
  - {id: n31, label: N31}
  - {id: n32, label: N32}
  - {id: n33, label: N33}
  - {id: n34, label: N34}
  - {id: n35, label: N35}
  - {id: n36, label: N36}
  - {id: n37, label: N37}
  - {id: n38, label: N38}
  - {id: n39, label: N39}
  - {id: n40, label: N40}
  - {id: n41, label: N41}
  - {id: n42, label: N42}
  - {id: n43, label: N43}
  - {id: n44, label: N44}
  - {id: n45, label: N45}
  - {id: n46, label: N46}
  - {id: n47, label: N47}
  - {id: n48, label: N48}
  - {id: n49, label: N49}
  - {id: n50, label: N50}
  - {id: n51, label: N51}
  - {id: n52, label: N52}
  - {id: n53, label: N53}
  - {id: n54, label: N54}
  - {id: n55, label: N55}
  - {id: n56, label: N56}
  - {id: n57, label: N57}
  - {id: n58, label: N58}
  - {id: n59, label: N59}
  - {id: n60, label: N60}
groups:
  - {id: g1, label: G1, nodes: [n1]}
  - {id: g2, label: G2, nodes: [n2]}
  - {id: g3, label: G3, nodes: [n3]}
  - {id: g4, label: G4, nodes: [n4]}
  - {id: g5, label: G5, nodes: [n5]}
  - {id: g6, label: G6, nodes: [n6]}
  - {id: g7, label: G7, nodes: [n7]}
  - {id: g8, label: G8, nodes: [n8]}
  - {id: g9, label: G9, nodes: [n9]}
  - {id: g10, label: G10, nodes: [n10]}
  - {id: g11, label: G11, nodes: [n11]}
  - {id: g12, label: G12, nodes: [n12]}
edges:
  - {from: n1, to: n2}
  - {from: n2, to: n3}
  - {from: n3, to: n4}
  - {from: n4, to: n5}
  - {from: n5, to: n6}
  - {from: n6, to: n7}
  - {from: n7, to: n8}
  - {from: n8, to: n9}
  - {from: n9, to: n10}
  - {from: n10, to: n11}
  - {from: n11, to: n12}
  - {from: n12, to: n13}
  - {from: n13, to: n14}
  - {from: n14, to: n15}
  - {from: n15, to: n16}
  - {from: n16, to: n17}
  - {from: n17, to: n18}
  - {from: n18, to: n19}
  - {from: n19, to: n20}
  - {from: n20, to: n21}
  - {from: n21, to: n22}
  - {from: n22, to: n23}
  - {from: n23, to: n24}
  - {from: n24, to: n25}
  - {from: n25, to: n26}
  - {from: n26, to: n27}
  - {from: n27, to: n28}
  - {from: n28, to: n29}
  - {from: n29, to: n30}
  - {from: n30, to: n31}
  - {from: n31, to: n32}
  - {from: n32, to: n33}
  - {from: n33, to: n34}
  - {from: n34, to: n35}
  - {from: n35, to: n36}
  - {from: n36, to: n37}
  - {from: n37, to: n38}
  - {from: n38, to: n39}
  - {from: n39, to: n40}
  - {from: n40, to: n41}
  - {from: n41, to: n42}
  - {from: n42, to: n43}
  - {from: n43, to: n44}
  - {from: n44, to: n45}
  - {from: n45, to: n46}
  - {from: n46, to: n47}
  - {from: n47, to: n48}
  - {from: n48, to: n49}
  - {from: n49, to: n50}
  - {from: n50, to: n51}
  - {from: n51, to: n52}
  - {from: n52, to: n53}
  - {from: n53, to: n54}
  - {from: n54, to: n55}
  - {from: n55, to: n56}
  - {from: n56, to: n57}
  - {from: n57, to: n58}
  - {from: n58, to: n59}
  - {from: n59, to: n60}
  - {from: n60, to: n1}
  - {from: n1, to: n2}
  - {from: n2, to: n3}
  - {from: n3, to: n4}
  - {from: n4, to: n5}
  - {from: n5, to: n6}
  - {from: n6, to: n7}
  - {from: n7, to: n8}
  - {from: n8, to: n9}
  - {from: n9, to: n10}
  - {from: n10, to: n11}
  - {from: n11, to: n12}
  - {from: n12, to: n13}
  - {from: n13, to: n14}
  - {from: n14, to: n15}
  - {from: n15, to: n16}
  - {from: n16, to: n17}
  - {from: n17, to: n18}
  - {from: n18, to: n19}
  - {from: n19, to: n20}
  - {from: n20, to: n21}
  - {from: n21, to: n22}
  - {from: n22, to: n23}
  - {from: n23, to: n24}
  - {from: n24, to: n25}
  - {from: n25, to: n26}
  - {from: n26, to: n27}
  - {from: n27, to: n28}
  - {from: n28, to: n29}
  - {from: n29, to: n30}
  - {from: n30, to: n31}
  - {from: n31, to: n32}
  - {from: n32, to: n33}
  - {from: n33, to: n34}
  - {from: n34, to: n35}
  - {from: n35, to: n36}
  - {from: n36, to: n37}
  - {from: n37, to: n38}
  - {from: n38, to: n39}
  - {from: n39, to: n40}
  - {from: n40, to: n41}
```

```diagram #chart-at
kind: chart
title: Many points
type: line
x: {label: X, numeric: {from: 0, to: 100}}
y: {label: Y}
series:
  - {name: A, values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
  - {name: B, values: [0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1, 2, 3, 4, 5, 6, 0, 1]}
```

```diagram #seq-at
kind: sequence
title: Many actors
actors:
  - {id: a1, label: A1}
  - {id: a2, label: A2}
  - {id: a3, label: A3}
  - {id: a4, label: A4}
  - {id: a5, label: A5}
  - {id: a6, label: A6}
  - {id: a7, label: A7}
  - {id: a8, label: A8}
  - {id: a9, label: A9}
  - {id: a10, label: A10}
  - {id: a11, label: A11}
  - {id: a12, label: A12}
steps:
  - {from: a1, to: a2, label: hi}
```

```figures #row-at
items:
  - image: img-1.png
    alt: Image 1
  - image: img-2.png
    alt: Image 2
  - image: img-3.png
    alt: Image 3
```

```figures #row-min
items:
  - image: img-1.png
    alt: Image 1
  - image: img-2.png
    alt: Image 2
```
