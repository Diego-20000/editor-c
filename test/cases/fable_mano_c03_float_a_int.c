#include <stdio.h>
int main() { float F[6] = {2.5f, -2.5f, 0.999f, 1e9f, -0.1f, 16777217.0f}; int I, K; for (K = 0; K < 6; K++) { I = F[K]; printf("%d ", I); } printf("\n"); I = 3.7 + 0.5; printf("%d\n", I); I = (int) (0.1 * 3 * 10); printf("%d\n", I); I = 1e2; printf("%d\n", I); return 0; }
