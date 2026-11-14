#include <stdio.h>

int ACKERMANN(int M, int N)
{
    if (M == 0)
    {
        return N + 1;
    }

    if (N == 0)
    {
        return ACKERMANN(M - 1, 1);
    }

    return ACKERMANN(M - 1, ACKERMANN(M, N - 1));
}

int SUMA_DIGITOS(int N)
{
    if (N < 10)
    {
        return N;
    }

    return (N % 10) + SUMA_DIGITOS(N / 10);
}

int main()
{
    printf("ACK_2_3=%d\n", ACKERMANN(2, 3));

    printf("SUMA_0=%d\n", SUMA_DIGITOS(0));
    printf("SUMA_7=%d\n", SUMA_DIGITOS(7));
    printf("SUMA_58321=%d\n", SUMA_DIGITOS(58321));
}
