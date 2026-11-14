#include <stdio.h>

int main()
{
    double A = 0.0;
    float B = 0.0f;
    double C = 0.0;
    int R;

    R = scanf("%lf %f %lf", &A, &B, &C);

    printf("R=%d\n", R);
    printf("A=%.17g\n", A);
    printf("B=%.9g\n", B);
    printf("C=%.17g\n", C);
}
