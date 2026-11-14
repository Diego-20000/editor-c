#include <stdio.h>

int main()
{
    double A = 1e15;
    double B = 1e16;
    double C = 1e22;

    printf("A_FIJO=%f\n", A);
    printf("A_GENERAL=%.17g\n", A);

    printf("B_FIJO=%f\n", B);
    printf("B_GENERAL=%.17g\n", B);

    printf("C_FIJO=%f\n", C);
    printf("C_EXP=%e\n", C);
}
