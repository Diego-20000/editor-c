#include <stdio.h>
int main() { int A = 1, B = 0, I; if (A) if (B) printf("uno\n"); else printf("dos\n"); if (A) { if (B) printf("tres\n"); } else printf("cuatro\n"); for (I = -1; I < 2; I++) if (I < 0) printf("neg "); else if (I == 0) printf("cero "); else printf("pos\n"); if (A = B) printf("no\n"); else printf("%d\n", A); if (!A) ; else printf("x\n"); return 0; }
