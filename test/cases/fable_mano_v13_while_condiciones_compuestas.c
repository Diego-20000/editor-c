#include <stdio.h>
int main() { int I = 0, J = 10, K = 0; while (I < J && K < 100) { I += 2; J--; K += I * J; } printf("%d %d %d\n", I, J, K); while (!(I == 0 || J == 0)) { if (I > J) I -= J; else J -= I; if (I == J) break; } printf("%d %d\n", I, J); I = 5; while (I-- > 0) K -= I; printf("%d %d\n", I, K); return 0; }
