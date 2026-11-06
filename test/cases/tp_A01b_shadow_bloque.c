#include <stdio.h>
int main()
{
    int x = 1;
    {
        printf("%d\n", x);
        int x = 2;
        printf("%d\n", x);
    }
    printf("%d\n", x);
    return 0;
}
