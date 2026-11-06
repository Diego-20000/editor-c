#include <stdio.h>
int main()
{
    printf("A\101B\n");
    printf("\033[1mnegrita\033[0m\n");
    printf("x\0y\n");
    printf("tab\7|\e|\n");
    return 0;
}
