#include <stdio.h>
int main()
{
    char linea[80];
    printf("Frase: ");
    fgets(linea, 80, stdin);
    printf("[%s]\n", linea);
    fgets(linea, 5, stdin);
    printf("[%s]\n", linea);
    return 0;
}
