#include <stdio.h>
#include <math.h>
int main(void) {
    float A, B;
    double H;
    scanf("%f%f", &A, &B);
    if (A < 0.0f || B < 0.0f || A > 100000.0f || B > 100000.0f) return 0;
    H = sqrt((double)A * A + (double)B * B);
    printf("Hipotenusa: %.2f\n", H);
    return 0;
}
