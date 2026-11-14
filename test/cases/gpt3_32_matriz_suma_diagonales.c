#include <stdio.h>

int main()
{
    int M[3][3] = {
        {4, 2, 8},
        {5, 9, 1},
        {7, 3, 6}
    };

    int I;
    int PRINCIPAL = 0;
    int SECUNDARIA = 0;

    for (I = 0; I < 3; I++)
    {
        PRINCIPAL = PRINCIPAL + M[I][I];
        SECUNDARIA = SECUNDARIA + M[I][2 - I];
    }

    printf("PRINCIPAL=%d\n", PRINCIPAL);
    printf("SECUNDARIA=%d\n", SECUNDARIA);
}
