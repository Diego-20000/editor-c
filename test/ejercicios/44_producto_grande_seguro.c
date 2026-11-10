#include <stdio.h>
int main(void) {
    int A, B;
    scanf("%d%d", &A, &B);
    if (A < 0 || A > 46340 || B < 0 || B > 46340) return 0;
    printf("Producto: %d\n", A * B);
    return 0;
}
