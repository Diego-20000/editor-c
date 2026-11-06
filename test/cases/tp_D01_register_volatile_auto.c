#include <stdio.h>
int main()
{
    register int i;
    int s = 0;
    for (i = 0; i < 5; i++) s += i;
    printf("%d\n", s);
    return 0;
}
