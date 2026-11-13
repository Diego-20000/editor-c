#include <stdio.h>

int CONVERTIR(int METROS);

int main()
{
    int METROS = 12;

    printf("METROS=%d\n", METROS);
    printf("CENTIMETROS=%d\n", CONVERTIR(METROS));
}

int CONVERTIR(int METROS)
{
    return METROS * 100;
}
