#include <stdio.h>

int main()
{
    double A = 1e-10;
    double B = 1e-100;
    double C = 1e-200;
    double D = 1e-300;

    printf("A=%f\n", A);
    printf("B=%e\n", B);
    printf("C=%.17g\n", C);
    printf("D=%.17e\n", D);
}
