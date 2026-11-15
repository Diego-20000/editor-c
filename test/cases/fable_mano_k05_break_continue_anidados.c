#include <stdio.h>
int main() { int I, J, C = 0; for (I = 0; I < 5; I++) { for (J = 0; J < 5; J++) { if (J == 3) break; if ((I + J) % 2) continue; C++; printf("%d%d ", I, J); } if (I == 3) break; } printf("\n%d %d %d\n", C, I, J); I = 0; while (1) { I++; if (I < 5) continue; if (I > 7) break; printf("%d ", I); } printf("\n"); return 0; }
