#include <stdio.h>
int main(void) {
    int A, B, C, M;
    scanf("%d%d%d", &A, &B, &C);
    M = A;
    if (B < M) M = B;
    if (C < M) M = C;
    printf("Menor: %d\n", M);
    return 0;
}
