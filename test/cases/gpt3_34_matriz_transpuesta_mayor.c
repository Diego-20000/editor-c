#include <stdio.h>

void MOSTRAR_TRANSPUESTA(int M[2][4])
{
    int I, J;

    for (J = 0; J < 4; J++)
    {
        for (I = 0; I < 2; I++)
        {
            printf("%4d", M[I][J]);
        }

        printf("\n");
    }
}

void INFORMAR_MAYOR(int M[2][4])
{
    int I, J;
    int MAYOR = M[0][0];
    int FILA = 0;
    int COLUMNA = 0;

    for (I = 0; I < 2; I++)
    {
        for (J = 0; J < 4; J++)
        {
            if (M[I][J] > MAYOR)
            {
                MAYOR = M[I][J];
                FILA = I;
                COLUMNA = J;
            }
        }
    }

    printf("MAYOR=%d\n", MAYOR);
    printf("FILA=%d COLUMNA=%d\n", FILA, COLUMNA);
}

int main()
{
    int M[2][4] = {
        {12, 45, 7, 23},
        {89, 16, 34, 5}
    };

    printf("TRANSPUESTA:\n");
    MOSTRAR_TRANSPUESTA(M);

    INFORMAR_MAYOR(M);
}
