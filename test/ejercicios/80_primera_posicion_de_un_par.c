#include <stdio.h>
int main(void) {
    int A[10], N, I, POS = -1;
    scanf("%d", &N);
    if (N < 1 || N > 10) return 0;
    for (I = 0; I < N; I++) scanf("%d", &A[I]);
    for (I = 0; I < N && POS == -1; I++)
        if (A[I] % 2 == 0) POS = I + 1;
    if (POS == -1) printf("No hay pares\n");
    else printf("Primer par en posicion %d\n", POS);
    return 0;
}
