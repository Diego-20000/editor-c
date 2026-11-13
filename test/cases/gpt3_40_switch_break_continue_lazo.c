#include <stdio.h>

int main()
{
    int CODIGOS[5] = {0, 1, 2, 3, 1};
    int I;

    for (I = 0; I < 5; I++)
    {
        printf("VUELTA=%d ", I);

        switch (CODIGOS[I])
        {
            case 0:
                printf("CERO ");
                break;

            case 1:
                printf("CONTINUE\n");
                continue;

            case 2:
                printf("BREAK_SWITCH ");
                break;

            case 3:
                printf("BREAK_SWITCH ");
                break;

            default:
                printf("OTRO ");
                break;
        }

        printf("DESPUES_SWITCH ");

        if (CODIGOS[I] == 3)
        {
            printf("BREAK_FOR\n");
            break;
        }

        printf("SIGUE_FOR\n");
    }
}
