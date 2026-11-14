#include <stdio.h>

int main()
{
    double VALOR = 12.6;
    char TEXTO[] = "TERMOMETRO";

    printf("[%5.0f]\n", VALOR);
    printf("[100%%]\n");
    printf("[%.3s]\n", TEXTO);
    printf("[%10.3s]\n", TEXTO);
}
