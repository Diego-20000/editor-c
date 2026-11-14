#include <stdio.h>

int main()
{
    char TECLA = 'r';

    switch (TECLA)
    {
        case 'R':
        case 'r':
            printf("REVERSA\n");
            break;

        case 'A':
        case 'a':
            printf("AVANCE\n");
            break;

        case 'P':
        case 'p':
            printf("PAUSA\n");
            break;

        default:
            printf("DESCONOCIDO\n");
            break;
    }
}
