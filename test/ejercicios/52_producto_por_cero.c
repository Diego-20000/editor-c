#include <stdio.h>
int main(void) {
    int A, B, P;
    scanf("%d%d", &A, &B);
    P = A * B;
    printf("Producto: %d\n", P);
    if (P == 0) printf("Resultado nulo\n");
    return 0;
}
