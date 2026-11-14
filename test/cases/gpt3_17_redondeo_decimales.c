#include <stdio.h>

int main()
{
    double A = 0.125;
    double B = 0.135;
    double C = 2.675;

    printf("A=%.2f\n", A);
    printf("B=%.2f\n", B);
    printf("C=%.2f\n", C);

    printf("A=%.20f\n", A);
    printf("B=%.20f\n", B);
    printf("C=%.20f\n", C);
}
