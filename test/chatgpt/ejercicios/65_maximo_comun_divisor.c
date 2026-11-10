#include <stdio.h>
int MCD(int A, int B);
int main(void) {
    int A, B;
    scanf("%d%d", &A, &B);
    if (A < 1 || B < 1 || A > 1000000 || B > 1000000) printf("Datos invalidos\n");
    else printf("MCD: %d\n", MCD(A, B));
    return 0;
}
int MCD(int A, int B) {
    int R;
    while (B != 0) { R = A % B; A = B; B = R; }
    return A;
}
