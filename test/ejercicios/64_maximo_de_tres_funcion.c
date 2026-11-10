#include <stdio.h>
int MAXIMO(int A, int B, int C);
int main(void) {
    int A, B, C;
    scanf("%d%d%d", &A, &B, &C);
    printf("Maximo: %d\n", MAXIMO(A, B, C));
    return 0;
}
int MAXIMO(int A, int B, int C) {
    int M = A;
    if (B > M) M = B;
    if (C > M) M = C;
    return M;
}
