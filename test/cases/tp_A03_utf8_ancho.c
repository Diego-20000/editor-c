#include <stdio.h>
int main()
{
    int n;
    printf("[%-12s][%8s]\n", "Descripción", "Precio");
    printf("[%10s][%.2s]\n", "Año", "ñu");
    n = printf("ñandú\n");
    printf("%d\n", n);
    return 0;
}
