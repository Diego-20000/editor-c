#include <stdio.h>
int main(void) {
    float A, B, C;
    scanf("%f%f%f", &A, &B, &C);
    printf("%.2f %.2f %.2f\n", A, B, C);
    printf("[%5.1f] [%5.1f] [%5.1f]\n", A, B, C);
    return 0;
}
