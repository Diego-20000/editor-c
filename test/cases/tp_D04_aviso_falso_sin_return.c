#include <stdio.h>
#include <stdlib.h>
int buscar(int x)
{
    do { x++; if (x > 5) return x; } while (1);
}
int salir(void)
{
    exit(1);
}
int main()
{
    printf("%d\n", buscar(1));
    return 0;
}
