#include <stdio.h>

int main()
{
    char VACIO[] = "";
    char UNO[] = "Q";
    char SALIDA[64];

    int N;

    N = sprintf(SALIDA, "[%s][%s][%.3s]",
                VACIO, UNO, "ESTACION");

    printf("SALIDA=%s\n", SALIDA);
    printf("CARACTERES=%d\n", N);
}
