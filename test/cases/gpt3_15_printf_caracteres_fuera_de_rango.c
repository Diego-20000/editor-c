#include <stdio.h>

int main()
{
    int A = 300;
    int B = 321;

    printf("[%c][%c]\n", A, B);

    printf("CODIGOS=%u,%u\n",
           (unsigned int)(unsigned char)A,
           (unsigned int)(unsigned char)B);
}
