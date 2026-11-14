#include <stdio.h>

int main()
{
    double A = 0.0;
    double B = 0.0;
    int R;

    R = scanf("%lf %lf", &A, &B);

    printf("R=%d\n", R);
    printf("A=%a\n", A);
    printf("B=%a\n", B);
    printf("A_DECIMAL=%.17g\n", A);
    printf("B_DECIMAL=%.17g\n", B);
}
