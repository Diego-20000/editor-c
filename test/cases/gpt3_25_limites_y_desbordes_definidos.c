#include <stdio.h>
#include <limits.h>

int main()
{
    unsigned int U = UINT_MAX;
    unsigned int SIGUIENTE = U + 1U;

    unsigned char BYTE_MAX = UCHAR_MAX;
    unsigned char DESPUES = (unsigned char)(BYTE_MAX + 1);

    printf("UINT_MAX=%u\n", U);
    printf("UINT_SIGUIENTE=%u\n", SIGUIENTE);

    printf("UCHAR_MAX=%u\n", (unsigned int)BYTE_MAX);
    printf("UCHAR_SIGUIENTE=%u\n", (unsigned int)DESPUES);

    printf("INT_MIN=%d\n", INT_MIN);
    printf("INT_MAX=%d\n", INT_MAX);
}
