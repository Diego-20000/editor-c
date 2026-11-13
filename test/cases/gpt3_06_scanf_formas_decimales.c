#include <stdio.h>

int main()
{
    float F = 0.0f;
    double A = 0.0;
    double B = 0.0;
    int R;

    R = scanf("%f %lf %lf", &F, &A, &B);

    printf("R=%d F=%.9g A=%.17g B=%.17g\n",
           R, F, A, B);
}
