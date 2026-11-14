#include <stdio.h>

int main()
{
    int CODIGO = 90;
    char LETRA = (char)CODIGO;
    int RECUPERADO = LETRA;

    unsigned char BYTE = (unsigned char)300;

    printf("CODIGO=%d\n", CODIGO);
    printf("LETRA=%c\n", LETRA);
    printf("RECUPERADO=%d\n", RECUPERADO);
    printf("BYTE=%u\n", (unsigned int)BYTE);
}
