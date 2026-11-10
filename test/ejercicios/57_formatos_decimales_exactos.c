#include <stdio.h>
int main(void) {
    float A, B;
    scanf("%f%f", &A, &B);
    printf("%.2f %.2f\n", A, B);
    printf("[%5.1f] [%5.1f]\n", A, B);
    return 0;
}
