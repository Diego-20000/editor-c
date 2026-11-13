#include <stdio.h>

int PRESION = 120;

void AJUSTAR(int VALOR)
{
    VALOR = VALOR + 5;

    printf("DENTRO=%d\n", VALOR);
}

int LEER_LOCAL(void)
{
    int PRESION = 80;

    return PRESION;
}

float LEER_TEMPERATURA(void)
{
    return 23.5f;
}

double LEER_DISTANCIA(void)
{
    return 123.456789;
}

char LEER_ESTADO(void)
{
    return 'A';
}

int main()
{
    int VALOR = 10;

    AJUSTAR(VALOR);

    printf("ORIGINAL=%d\n", VALOR);

    printf("GLOBAL=%d\n", PRESION);
    printf("LOCAL=%d\n", LEER_LOCAL());

    printf("TEMPERATURA=%f\n", LEER_TEMPERATURA());
    printf("DISTANCIA=%.9f\n", LEER_DISTANCIA());
    printf("ESTADO=%c\n", LEER_ESTADO());
}
