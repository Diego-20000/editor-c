#include <stdio.h>
#include <math.h>

int main()
{
    double A = -0.0;
    double B = 0.0;

    printf("A=%f\n", A);
    printf("B=%f\n", B);

    printf("A_SIGNO=%+.1f\n", A);
    printf("B_SIGNO=%+.1f\n", B);

    printf("A_HEX=%a\n", A);
    printf("B_HEX=%a\n", B);

    printf("A_SIGNBIT=%d\n", !!signbit(A));
    printf("B_SIGNBIT=%d\n", !!signbit(B));
}
