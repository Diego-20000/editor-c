#include <stdio.h>

void MULTIPLICAR(int A[3][3], int B[3][3], int R[3][3])
{
    int I, J, K;

    for (I = 0; I < 3; I++)
    {
        for (J = 0; J < 3; J++)
        {
            R[I][J] = 0;

            for (K = 0; K < 3; K++)
            {
                R[I][J] = R[I][J] + A[I][K] * B[K][J];
            }
        }
    }
}

void MOSTRAR(int M[3][3])
{
    int I, J;

    for (I = 0; I < 3; I++)
    {
        for (J = 0; J < 3; J++)
        {
            printf("%4d", M[I][J]);
        }

        printf("\n");
    }
}

int main()
{
    int A[3][3] = {
        {1, 2, 3},
        {4, 5, 6},
        {7, 8, 9}
    };

    int B[3][3] = {
        {9, 8, 7},
        {6, 5, 4},
        {3, 2, 1}
    };

    int R[3][3];

    MULTIPLICAR(A, B, R);

    printf("RESULTADO:\n");
    MOSTRAR(R);
}
