#include <stdio.h>

int main()
{
    double A = 123456789.0;
    double B = 0.000012345;
    double C = 987654321.0;

    printf("A_e=%e\n", A);
    printf("A_g=%g\n", A);
    printf("B_g=%g\n", B);
    printf("B_G=%G\n", B);
    printf("C_G=%G\n", C);

    printf("PRECISION=%g|%.10g|%.15g\n",
           A, A, A);
}
