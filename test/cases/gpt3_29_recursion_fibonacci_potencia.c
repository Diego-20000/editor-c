#include <stdio.h>

long FIBONACCI(int N)
{
    if (N <= 1)
    {
        return N;
    }

    return FIBONACCI(N - 1) + FIBONACCI(N - 2);
}

long POTENCIA(int BASE, int EXP)
{
    if (EXP == 0)
    {
        return 1;
    }

    return BASE * POTENCIA(BASE, EXP - 1);
}

int main()
{
    printf("FIB_0=%ld\n", FIBONACCI(0));
    printf("FIB_1=%ld\n", FIBONACCI(1));
    printf("FIB_10=%ld\n", FIBONACCI(10));

    printf("POTENCIA=%ld\n", POTENCIA(3, 5));
    printf("POTENCIA_CERO=%ld\n", POTENCIA(7, 0));
}
