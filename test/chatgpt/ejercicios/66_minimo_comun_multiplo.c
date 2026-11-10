#include <stdio.h>
int MCD(int A, int B);
int main(void) {
    int A, B, MCM;
    scanf("%d%d", &A, &B);
    if (A < 1 || B < 1 || A > 10000 || B > 10000) return 0;
    MCM = (A / MCD(A, B)) * B;
    printf("MCM: %d\n", MCM);
    return 0;
}
int MCD(int A, int B) {
    int R;
    while (B != 0) { R = A % B; A = B; B = R; }
    return A;
}
