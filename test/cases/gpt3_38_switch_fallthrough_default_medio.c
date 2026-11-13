#include <stdio.h>

int main()
{
    int OPCIONES[3] = {1, 2, 9};
    int I;

    for (I = 0; I < 3; I++)
    {
        printf("OPCION=%d: ", OPCIONES[I]);

        switch (OPCIONES[I])
        {
            case 1:
                printf("UNO ");
                /* fall through */

            case 2:
                printf("DOS ");
                /* fall through */

            default:
                printf("DEFAULT ");
                /* fall through */

            case 3:
                printf("TRES ");
                break;
        }

        printf("\n");
    }
}
