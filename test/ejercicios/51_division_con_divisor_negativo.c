#include <stdio.h>
int main(void) {
    int A, B;
    scanf("%d%d", &A, &B);
    if (B == 0) printf("Divisor cero\n");
    else if (A % B == 0) printf("Cociente: %d\n", A / B);
    else printf("Hay resto\n");
    return 0;
}
