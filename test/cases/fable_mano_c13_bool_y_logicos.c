#include <stdio.h>
#include <stdbool.h>
int main() { bool B = 5; bool C = 0.5; int I = !5, J = !!7, K = !0; printf("%d %d %d %d %d\n", B, C, I, J, K); printf("%d %d %d\n", 3 > 2 > 1, 1 < 2 < 3, 5 == 5 == 1); printf("%d %d\n", (3 > 2) + (2 > 3), -(5 > 1)); B = B + 1; printf("%d %d\n", B, true + true); return 0; }
