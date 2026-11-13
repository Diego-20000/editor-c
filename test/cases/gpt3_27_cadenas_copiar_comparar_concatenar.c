#include <stdio.h>
#include <string.h>

int main()
{
    char ORIGINAL[32] = "CAJA";
    char COPIA[32];

    int IGUALES;
    int A_MENOR_B;
    int B_MAYOR_A;

    strcpy(COPIA, ORIGINAL);

    IGUALES = (strcmp(COPIA, ORIGINAL) == 0);
    A_MENOR_B = (strcmp("A", "B") < 0);
    B_MAYOR_A = (strcmp("B", "A") > 0);

    printf("COPIA=%s\n", COPIA);
    printf("IGUALES=%d\n", IGUALES);
    printf("A_MENOR_B=%d\n", A_MENOR_B);
    printf("B_MAYOR_A=%d\n", B_MAYOR_A);

    strcat(COPIA, "-A17");

    printf("CONCATENADA=%s\n", COPIA);
    printf("ORIGINAL=%s\n", ORIGINAL);
}
